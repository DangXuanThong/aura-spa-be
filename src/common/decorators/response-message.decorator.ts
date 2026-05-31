import { SetMetadata } from '@nestjs/common';
import { RESPONSE_MESSAGE_METADATA } from '../constants/response-message.constant';

export const ResponseMessage = (message: string) => SetMetadata(RESPONSE_MESSAGE_METADATA, message);
