import { Controller, Get, Post, Body, Param, UseGuards, Request } from '@nestjs/common';
import { VendorBillsService } from './vendor-bills.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';

@Controller('vendor-bills')
@UseGuards(JwtAuthGuard, RolesGuard)
export class VendorBillsController {
    constructor(private readonly vendorBillsService: VendorBillsService) { }

    @Post()
    create(@Body() createDto: any, @Request() req) {
        return this.vendorBillsService.create(createDto, req.user);
    }

    @Get()
    findAll(@Request() req) {
        return this.vendorBillsService.findAll(req.user);
    }

    @Get(':id')
    findOne(@Param('id') id: string, @Request() req) {
        return this.vendorBillsService.findOne(id, req.user);
    }

    @Post(':id/post')
    post(@Param('id') id: string, @Request() req) {
        return this.vendorBillsService.post(id, req.user);
    }

    @Post(':id/pay')
    recordPayment(
        @Param('id') id: string,
        @Body('paymentAccountId') paymentAccountId: string,
        @Request() req
    ) {
        return this.vendorBillsService.recordPayment(id, paymentAccountId, req.user);
    }
}
