import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { AiService } from './ai.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('ai')
@UseGuards(JwtAuthGuard)
export class AiController {
    constructor(private readonly aiService: AiService) { }

    @Post('chat')
    async chat(@Body('message') message: string) {
        const response = await this.aiService.generateText(message);
        return { response };
    }

    @Post('scan-receipt')
    async scanReceipt(@Body('image') imageBase64: string) {
        const data = await this.aiService.analyzeReceipt(imageBase64);
        return { data };
    }
}
