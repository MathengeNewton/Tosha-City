import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CustomersService } from './customers.service';
import { Customer, CustomerType } from './entities/customer.entity';
import { CustomerProductPrice } from './entities/customer-product-price.entity';
import { Sale } from '../sales/entities/sale.entity';
import { Product } from '../products/entities/product.entity';

describe('CustomersService.resolveUnitPrice', () => {
  let service: CustomersService;
  let priceRepository: { findOne: jest.Mock };

  const product = { id: 2, defaultPrice: '600.00', wholesalePrice: '560.00' } as unknown as Product;
  const wholesale = { id: 7, isWholesale: true, type: CustomerType.WHOLESALE } as Customer;
  const regular = { id: 8, isWholesale: false, type: CustomerType.REGULAR } as Customer;

  beforeEach(async () => {
    priceRepository = { findOne: jest.fn().mockResolvedValue(null) };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CustomersService,
        { provide: getRepositoryToken(Customer), useValue: {} },
        { provide: getRepositoryToken(Sale), useValue: {} },
        { provide: getRepositoryToken(CustomerProductPrice), useValue: priceRepository },
        { provide: getRepositoryToken(Product), useValue: {} },
      ],
    }).compile();
    service = module.get(CustomersService);
  });

  it('uses retail price when there is no customer', async () => {
    await expect(service.resolveUnitPrice(null, product)).resolves.toBe(600);
  });

  it('uses retail price for regular customers, ignoring any special price', async () => {
    priceRepository.findOne.mockResolvedValue({ price: '500.00' });
    await expect(service.resolveUnitPrice(regular, product)).resolves.toBe(600);
  });

  it("uses the customer's special price for wholesale customers when one is set", async () => {
    priceRepository.findOne.mockResolvedValue({ price: '520.00' });
    await expect(service.resolveUnitPrice(wholesale, product)).resolves.toBe(520);
    expect(priceRepository.findOne).toHaveBeenCalledWith({ where: { customerId: 7, productId: 2 } });
  });

  it('falls back to the product wholesale price, then retail', async () => {
    await expect(service.resolveUnitPrice(wholesale, product)).resolves.toBe(560);
    const noWholesale = { ...product, wholesalePrice: null } as unknown as Product;
    await expect(service.resolveUnitPrice(wholesale, noWholesale)).resolves.toBe(600);
  });
});
