import { CacheModule, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { General, GeneralSchema } from 'server/common/general.schema';
import { ChannelsController } from './channels.controller';
import { ChannelsService } from './channels.service';
import { ChannelBasicInfo, ChannelBasicInfoSchema } from './schemas/channel-basic-info.schema';

@Module({
  providers: [ChannelsService],
  controllers: [ChannelsController],
  imports: [
    CacheModule.register({
      ttl: 1200,
      max: 200
    }),
    MongooseModule.forFeature([
      {
        name: ChannelBasicInfo.name,
        schema: ChannelBasicInfoSchema,
        collection: 'channel-basicinfo'
      },
      {
        name: General.name,
        schema: GeneralSchema,
        collection: 'general'
      }
    ])
  ]
})
export class ChannelsModule {}
