import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';

@Injectable()
export class AiService {
    private genAI: GoogleGenerativeAI;
    private model: any;

    constructor(private configService: ConfigService) {
        const apiKey = this.configService.get<string>('GEMINI_API_KEY') || '';
        if (!apiKey) {
            console.warn('GEMINI_API_KEY is not set');
        }
        this.genAI = new GoogleGenerativeAI(apiKey);
        this.model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    }

    async generateText(prompt: string): Promise<string> {
        const result = await this.model.generateContent(prompt);
        const response = await result.response;
        return response.text();
    }

    async analyzeReceipt(imageBase64: string): Promise<any> {
        const prompt = `Analyze this receipt image and extract the following details in JSON format:
    - merchantName (string)
    - date (string, YYYY-MM-DD)
    - totalAmount (number)
    - taxAmount (number)
    - currency (string)
    - items (array of objects with description, quantity, unitPrice, total)
    
    Only return the JSON object, no markdown formatting.`;

        const image = {
            inlineData: {
                data: imageBase64,
                mimeType: 'image/jpeg',
            },
        };

        const result = await this.model.generateContent([prompt, image]);
        const response = await result.response;
        const text = response.text();

        // Clean up markdown code blocks if present
        const jsonString = text.replace(/```json\n|\n```/g, '').trim();

        try {
            return JSON.parse(jsonString);
        } catch (error) {
            console.error('Failed to parse Gemini response:', text);
            throw new Error('Failed to extract data from receipt');
        }
    }
}
