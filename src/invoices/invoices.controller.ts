import {
    Controller,
    Get,
    Post,
    Body,
    Patch,
    Param,
    Delete,
    UseGuards,
    Request,
    UseInterceptors,
    UploadedFile,
    BadRequestException,
    Query,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { InvoicesService } from './invoices.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';

@Controller('invoices')
@UseGuards(JwtAuthGuard, RolesGuard)
export class InvoicesController {
    constructor(private readonly invoicesService: InvoicesService) { }

    @Post()
    create(@Body() createInvoiceDto: CreateInvoiceDto, @Request() req) {
        return this.invoicesService.create(createInvoiceDto, req.user);
    }

    @Post('import')
    @UseInterceptors(
        FileInterceptor('file', {
            storage: diskStorage({
                destination: './uploads/imports',
                filename: (req, file, cb) => {
                    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
                    cb(null, `import-${uniqueSuffix}.csv`);
                },
            }),
            limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
            fileFilter: (req, file, cb) => {
                if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
                    cb(null, true);
                } else {
                    cb(new BadRequestException('Only CSV files are allowed!'), false);
                }
            },
        }),
    )
    async importInvoices(@UploadedFile() file: Express.Multer.File, @Request() req) {
        if (!file) {
            throw new BadRequestException('No file uploaded');
        }
        return this.invoicesService.importFromCSV(file, req.user);
    }

    @Post(':id/pay')
    recordPayment(
        @Param('id') id: string,
        @Body() paymentData: { amount: number; date: string; method: string; accountId: string; reference: string },
        @Request() req
    ) {
        return this.invoicesService.recordPayment(
            id,
            paymentData.amount,
            paymentData.date, // Pass as string, let service handle conversion
            paymentData.method,
            paymentData.accountId,
            paymentData.reference,
            req.user
        );
    }

    @Get()
    findAll(@Query() pagination: any, @Request() req) {
        return this.invoicesService.findAll(pagination, req.user);
    }

    @Get(':id')
    findOne(@Param('id') id: string, @Request() req) {
        return this.invoicesService.findOne(id, req.user);
    }

    @Patch(':id')
    update(
        @Param('id') id: string,
        @Body() updateInvoiceDto: UpdateInvoiceDto,
        @Request() req,
    ) {
        return this.invoicesService.update(id, updateInvoiceDto, req.user);
    }

    @Delete(':id')
    remove(@Param('id') id: string, @Request() req) {
        return this.invoicesService.remove(id, req.user);
    }

    @Patch(':id/mark-paid')
    markAsPaid(@Param('id') id: string, @Request() req) {
        return this.invoicesService.markAsPaid(id, req.user);
    }
}
