import { 
  Controller, 
  Get, 
  Post, 
  Delete, 
  Param, 
  UseGuards, 
  UseInterceptors, 
  UploadedFile, 
  Request 
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { InboxService } from './inbox.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';

@Controller('inbox')
@UseGuards(JwtAuthGuard, RolesGuard)
export class InboxController {
  constructor(private readonly inboxService: InboxService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  uploadFile(@UploadedFile() file: Express.Multer.File, @Request() req) {
    return this.inboxService.uploadFile(file, req.user);
  }

  @Get()
  findAll(@Request() req) {
    return this.inboxService.findAll(req.user);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Request() req) {
    return this.inboxService.delete(id, req.user);
  }
}
