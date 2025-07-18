import { Test, TestingModule } from '@nestjs/testing';
import { OutreachController } from './outreach.controller';

describe('OutreachController', () => {
  let controller: OutreachController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OutreachController],
    }).compile();

    controller = module.get<OutreachController>(OutreachController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
