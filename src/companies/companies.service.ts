import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Company } from './entities/company.entity';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { UpdateCompanySettingsDto } from './dto/update-company-settings.dto';

@Injectable()
export class CompaniesService {
  constructor(
    @InjectRepository(Company)
    private companiesRepository: Repository<Company>,
  ) { }

  async create(createCompanyDto: CreateCompanyDto): Promise<Company> {
    const company = this.companiesRepository.create(
      createCompanyDto as unknown as Company,
    );
    return this.companiesRepository.save(company);
  }

  async findAll(): Promise<Company[]> {
    return this.companiesRepository.find({
      relations: ['users'],
    });
  }

  async findOne(id: string): Promise<Company> {
    const company = await this.companiesRepository.findOne({
      where: { id },
      relations: ['users'],
    });
    if (!company) {
      throw new NotFoundException(`Company with ID ${id} not found`);
    }
    return company;
  }

  async update(id: string, updateCompanyDto: UpdateCompanyDto): Promise<Company> {
    await this.companiesRepository.update(id, updateCompanyDto as any);
    return this.findOne(id);
  }

  async updateSettings(
    companyId: string,
    updateSettingsDto: UpdateCompanySettingsDto,
  ): Promise<Company> {
    await this.companiesRepository.update(companyId, updateSettingsDto);
    return this.findOne(companyId);
  }

  async uploadLogo(
    companyId: string,
    file: Express.Multer.File,
  ): Promise<{ url: string }> {
    const url = `/uploads/logos/${file.filename}`;
    await this.companiesRepository.update(companyId, { logoUrl: url });
    return { url };
  }

  async remove(id: string): Promise<void> {
    const result = await this.companiesRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Company with ID ${id} not found`);
    }
  }
}
