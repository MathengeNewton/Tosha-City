import {
  Controller,
  Post,
  Get,
  Param,
  UseInterceptors,
  UploadedFile,
  Res,
  UseGuards,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { Response } from 'express';
import { UploadsService } from './uploads.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../roles/entities/role.entity';

@ApiTags('Uploads')
@Controller('uploads')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class UploadsController {
  constructor(private readonly uploadsService: UploadsService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.CASHIER)
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Upload a file (photo for wastage)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  async uploadFile(@UploadedFile() file: Express.Multer.File) {
    const filePath = await this.uploadsService.saveFile(file);
    return {
      filename: filePath,
      url: `/api/uploads/${filePath.split('/').pop()}`,
    };
  }

  @Get(':filename')
  @ApiOperation({ summary: 'Get an uploaded file' })
  async getFile(@Param('filename') filename: string, @Res() res: Response) {
    const fileStream = this.uploadsService.getFileStream(`uploads/wastage/${filename}`);
    fileStream.pipe(res);
  }
}

