import { Test, TestingModule } from '@nestjs/testing';
import { RdtrController } from './rdtr.controller';

describe('RdtrController', () => {
  let controller: RdtrController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RdtrController],
    }).compile();

    controller = module.get<RdtrController>(RdtrController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
