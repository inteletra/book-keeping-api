import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { OcrService } from './ocr.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('ocr')
@UseGuards(JwtAuthGuard)
export class OcrController {
    constructor(private readonly ocrService: OcrService) { }

    @Post('scan')
    async scanReceipt(@Body('image') imageBase64: string) {
        const data = await this.ocrService.recognize(imageBase64);
        return { data };
    }
}
