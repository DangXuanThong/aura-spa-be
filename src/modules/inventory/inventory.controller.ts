import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Request, UseGuards } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { plainToInstance } from 'class-transformer';
import { Roles } from 'src/common/decorators/roles.decorator';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { UserRole } from 'src/modules/user/enums/user-role.enum';
import { InventoryService } from './inventory.service';
import { ImportStockDto } from './dto/import-stock.dto';
import { ConsumeStockDto } from './dto/consume-stock.dto';
import { StockCheckDto } from './dto/stock-check.dto';
import { BranchInventoryResponseDto, InventoryTransactionResponseDto } from './dto/branch-inventory-response.dto';
import { InventoryItem } from './entities/inventory-item.entity';

@ApiTags('Inventory')
@Controller('inventory')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.Manager)
@ApiBearerAuth('access-token')
@ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
@ApiForbiddenResponse({ description: 'Manager role required or not assigned to this branch' })
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  // ── UC30: List stock levels for a branch ─────────────────────────────────────

  @Get('branch/:branchId')
  @Roles(UserRole.Manager, UserRole.Staff)
  @ApiOkResponse({ description: 'Current stock levels for the branch', type: [BranchInventoryResponseDto] })
  async listByBranch(@Param('branchId') branchId: string, @Request() req: any): Promise<BranchInventoryResponseDto[]> {
    const rows = await this.inventoryService.listByBranch(branchId, req.user.id);
    return rows.map((row) => {
      const dto = plainToInstance(BranchInventoryResponseDto, row);
      const minLevel = row.inventoryItem ? parseFloat((row.inventoryItem as InventoryItem).minStockLevel as unknown as string) : null;
      const current = parseFloat(row.currentQuantity as unknown as string);
      dto.isLowStock = minLevel !== null && !isNaN(minLevel) && current < minLevel;
      return dto;
    });
  }

  // ── UC30: Import new stock ────────────────────────────────────────────────────

  @Post('branch/:branchId/import')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ description: 'Stock imported — returns the transaction record', type: InventoryTransactionResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid quantity' })
  @ApiNotFoundResponse({ description: 'Inventory item not found at this branch' })
  async importStock(@Param('branchId') branchId: string, @Body() dto: ImportStockDto, @Request() req: any): Promise<InventoryTransactionResponseDto> {
    const tx = await this.inventoryService.importStock(branchId, dto, req.user.id);
    return plainToInstance(InventoryTransactionResponseDto, tx);
  }

  // ── UC30: Consume stock ───────────────────────────────────────────────────────

  @Post('branch/:branchId/consume')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ description: 'Stock consumed — returns the transaction record', type: InventoryTransactionResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid quantity or insufficient stock' })
  @ApiNotFoundResponse({ description: 'Inventory item not found at this branch' })
  async consumeStock(
    @Param('branchId') branchId: string,
    @Body() dto: ConsumeStockDto,
    @Request() req: any,
  ): Promise<InventoryTransactionResponseDto> {
    const tx = await this.inventoryService.consumeStock(branchId, dto, req.user.id);
    return plainToInstance(InventoryTransactionResponseDto, tx);
  }

  // ── UC30: Stock check / correction ───────────────────────────────────────────

  @Post('branch/:branchId/stock-check')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ description: 'Stock check recorded — returns the correction transaction', type: InventoryTransactionResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid quantity' })
  @ApiNotFoundResponse({ description: 'Inventory item not found at this branch' })
  async stockCheck(@Param('branchId') branchId: string, @Body() dto: StockCheckDto, @Request() req: any): Promise<InventoryTransactionResponseDto> {
    const tx = await this.inventoryService.stockCheck(branchId, dto, req.user.id);
    return plainToInstance(InventoryTransactionResponseDto, tx);
  }

  // ── UC30: Get service inventory requirements (recipes) ────────────────────────
  @Get('requirements')
  @Roles(UserRole.Manager, UserRole.Owner)
  @ApiOkResponse({ description: 'Service inventory requirements list' })
  async getRequirements(): Promise<any[]> {
    return this.inventoryService.getRequirements();
  }

  // ── Owner & Manager: List all active inventory items ───────────────────────────
  @Get('items')
  @Roles(UserRole.Manager, UserRole.Owner)
  @ApiOkResponse({ description: 'All active inventory items list' })
  async listAllItems(): Promise<any[]> {
    return this.inventoryService.listAllItems();
  }

  // ── Owner: Create a service requirement ────────────────────────────────────────
  @Post('requirements')
  @Roles(UserRole.Owner)
  @ApiOkResponse({ description: 'Created requirement' })
  async createRequirement(
    @Body() dto: { serviceId: string; inventoryItemId: string; quantityPerService: number },
  ): Promise<any> {
    return this.inventoryService.createRequirement(dto);
  }

  // ── Owner: Update a service requirement ────────────────────────────────────────
  @Patch('requirements/:id')
  @Roles(UserRole.Owner)
  @ApiOkResponse({ description: 'Updated requirement' })
  async updateRequirement(
    @Param('id') id: string,
    @Body() dto: { quantityPerService: number; isActive?: boolean },
  ): Promise<any> {
    return this.inventoryService.updateRequirement(id, dto);
  }

  // ── Owner: Delete a service requirement ────────────────────────────────────────
  @Delete('requirements/:id')
  @Roles(UserRole.Owner)
  @ApiOkResponse({ description: 'Deleted requirement' })
  async deleteRequirement(@Param('id') id: string): Promise<void> {
    return this.inventoryService.deleteRequirement(id);
  }
}
