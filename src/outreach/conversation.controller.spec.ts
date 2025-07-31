import { Test, TestingModule } from '@nestjs/testing';
import { ConversationController } from './conversation.controller';
import { OutreachService } from './outreach.service';

describe('ConversationController', () => {
  let controller: ConversationController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ConversationController],
      // Mock the OutreachService to avoid real database calls in unit tests
      providers: [
        {
          provide: OutreachService,
          useValue: {
            // Mock any methods that the controller calls
            create: jest.fn(),
            findAll: jest.fn(),
            // ... add other mocks as needed
          },
        },
      ],
    }).compile();

    controller = module.get<ConversationController>(ConversationController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
