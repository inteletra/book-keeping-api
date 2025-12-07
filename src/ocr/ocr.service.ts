import { Injectable } from '@nestjs/common';
import { createWorker } from 'tesseract.js';

@Injectable()
export class OcrService {
    async recognize(imageBase64: string): Promise<any> {
        const worker = await createWorker('eng');
        const buffer = Buffer.from(imageBase64.replace(/^data:image\/\w+;base64,/, ''), 'base64');

        const ret = await worker.recognize(buffer);
        const text = ret.data.text;
        await worker.terminate();

        return this.parseText(text);
    }

    private parseText(text: string): any {
        const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);

        const datePattern = /\b\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}\b/;
        let date: string | null = null;
        let totalAmount: number | null = null;
        let merchantName = lines[0] || 'Unknown Merchant';

        console.log('=== OCR DEBUG START ===');
        console.log('Total lines:', lines.length);
        console.log('Merchant name:', merchantName);

        for (const line of lines) {
            // Check if line contains "invoice amount" or "finvoice amount"
            const hasInvoiceAmount = line.match(/f?invoice\s+amount/i);

            if (hasInvoiceAmount) {
                console.log('✓ FOUND Invoice Amount line:', line);

                // Match AED or A€D (OCR error) followed by numbers
                const amounts = line.match(/A[E€]D\s*([0-9,\s]+(?:\.\d{2})?)/gi);
                console.log('  Amounts found:', amounts);

                if (amounts && amounts.length > 0) {
                    const lastAmount = amounts[amounts.length - 1];
                    console.log('  Last amount string:', lastAmount);

                    const numMatch = lastAmount.match(/([0-9,\s]+(?:\.\d{2})?)/);
                    console.log('  Number match:', numMatch);

                    if (numMatch) {
                        let cleanNum = numMatch[1].replace(/[,\s]/g, '');
                        console.log('  Clean number (before decimal fix):', cleanNum);

                        if (!cleanNum.includes('.') && cleanNum.length >= 5) {
                            const len = cleanNum.length;
                            cleanNum = cleanNum.substring(0, len - 2) + '.' + cleanNum.substring(len - 2);
                            console.log('  Clean number (after decimal fix):', cleanNum);
                        }

                        totalAmount = parseFloat(cleanNum);
                        console.log('  ✓ FINAL TOTAL:', totalAmount);
                        break;
                    }
                } else {
                    console.log('  ✗ No AED/A€D amounts found in this line');
                }
            }
        }

        if (!totalAmount) {
            console.log('⚠ Invoice Amount not found, trying fallback...');
            for (let i = lines.length - 1; i >= Math.max(0, lines.length - 15); i--) {
                const line = lines[i];
                if (line.match(/total\s*$/i)) {
                    const amounts = line.match(/A[E€]D\s*([0-9,\s]+(?:\.\d{2})?)/gi);
                    if (amounts && amounts.length > 0) {
                        const lastAmount = amounts[amounts.length - 1];
                        const numMatch = lastAmount.match(/([0-9,\s]+(?:\.\d{2})?)/);
                        if (numMatch) {
                            let cleanNum = numMatch[1].replace(/[,\s]/g, '');
                            if (!cleanNum.includes('.') && cleanNum.length >= 5) {
                                const len = cleanNum.length;
                                cleanNum = cleanNum.substring(0, len - 2) + '.' + cleanNum.substring(len - 2);
                            }
                            totalAmount = parseFloat(cleanNum);
                            break;
                        }
                    }
                }
            }
        }

        for (const line of lines) {
            if (!date && datePattern.test(line)) {
                const match = line.match(datePattern);
                if (match) date = match[0];
            }
        }

        console.log('=== OCR DEBUG END ===');
        console.log('Final result:', { merchantName, date, totalAmount, currency: 'AED' });

        return {
            merchantName,
            date,
            totalAmount,
            currency: 'AED',
            items: null,
            rawText: text,
        };
    }
}
