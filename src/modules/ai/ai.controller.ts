import { Body, Controller, HttpCode, HttpStatus, Post, Request, ServiceUnavailableException, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { ConfigService } from '@nestjs/config';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { UserRole } from 'src/modules/user/enums/user-role.enum';
import { OptionalJwtAuthGuard } from './guards/optional-jwt-auth.guard';
import { RecommendServicesDto } from './dto/recommend-services.dto';
import { ConciergeChatDto } from './dto/concierge-chat.dto';
import { GenerateStrategiesDto } from './dto/generate-strategies.dto';
import { RecommendService } from './services/recommend.service';
import { ConciergeService } from './services/concierge.service';
import { StrategyGenerateService } from './services/strategy-generate.service';
import { buildSuccessResponse } from 'src/common/dto/api-response.dto';

@ApiTags('AI')
@Controller('ai')
export class AiController {
  constructor(
    private readonly config: ConfigService,
    private readonly recommendService: RecommendService,
    private readonly conciergeService: ConciergeService,
    private readonly strategyGenerateService: StrategyGenerateService,
  ) {}

  private assertAiEnabled(): void {
    if (this.config.get<string>('AI_ENABLED', 'true') === 'false') {
      throw new ServiceUnavailableException('AI features are disabled');
    }
  }

  @Post('recommend-services')
  @UseGuards(OptionalJwtAuthGuard, ThrottlerGuard)
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('access-token')
  @ApiOkResponse({ description: 'Personalized service recommendations' })
  async recommend(@Body() dto: RecommendServicesDto, @Request() req: any) {
    this.assertAiEnabled();
    const userId = req.user?.id ?? null;
    const data = await this.recommendService.recommend(dto, userId);
    return buildSuccessResponse(data);
  }

  @Post('concierge/chat')
  @UseGuards(OptionalJwtAuthGuard, ThrottlerGuard)
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('access-token')
  @ApiOkResponse({ description: 'Aura AI booking concierge reply' })
  async conciergeChat(@Body() dto: ConciergeChatDto, @Request() req: any) {
    this.assertAiEnabled();
    const userId = req.user?.id ?? null;
    const data = await this.conciergeService.chat(dto, userId);
    return buildSuccessResponse(data);
  }

  @Post('strategies/generate')
  @UseGuards(JwtAuthGuard, RolesGuard, ThrottlerGuard)
  @Roles(UserRole.Owner)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('access-token')
  @ApiOkResponse({ description: 'AI-generated strategies (status=proposed)' })
  async generateStrategies(@Body() dto: GenerateStrategiesDto, @Request() req: any) {
    this.assertAiEnabled();
    const data = await this.strategyGenerateService.generate(dto, req.user.id);
    return buildSuccessResponse(data);
  }
}
