import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import fetch from 'node-fetch';
import { General } from 'server/common/general.schema';
import { ChannelMapper } from './channel.mapper';
import { ChannelDto } from './dto/channel.dto';

@Injectable()
export class ChannelsService {
  constructor(
    @InjectModel(General.name)
    private readonly generalModel: Model<General>
  ) {}
  private youtubeClientParams = {
    hl: 'en',
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/85.0.4183.102 Safari/537.36',
    clientName: 'WEB',
    clientVersion: '2.20200922.02.00',
    osName: 'Windows',
    browserName: 'Chrome',
    browserVersion: '85.0.4183.102',
    screenHeightPoints: 767,
    screenPixelDensity: 1,
    screenWidthPoints: 1536
  };

  private featuredParam = 'EghmZWF0dXJlZA%3D%3D';
  private videosParam = 'EgZ2aWRlb3M%3D';
  private aboutParam = 'EgVhYm91dA%3D%3D';

  private channelApiUrl = 'https://www.youtube.com/youtubei/v1/browse';

  async getChannel(channelId: string): Promise<ChannelDto> {
    const generalRecord = await this.generalModel.findOne({ version: 1 }).exec();
    let apiKey: string | void;
    if (!(generalRecord && generalRecord.innertubeApiKey)) {
      apiKey = await this.refreshApiKey();
    } else if (generalRecord && generalRecord.innertubeApiKey) {
      apiKey = generalRecord.innertubeApiKey;
    }
    if (apiKey) {
      try {
        const rawChannelData = await fetch(`${this.channelApiUrl}?key=${apiKey}`, {
          method: 'POST',
          headers: {
            Accept: 'text/html, application/xhtml+xml, application/xml;q=0.9, */*;q=0.8',
            'Content-Type': 'text/html; charset=UTF-8',
            'User-Agent': this.youtubeClientParams.userAgent
          },
          body: JSON.stringify({
            context: {
              client: this.youtubeClientParams
            },
            browseId: channelId,
            params: this.featuredParam
          })
        }).then(response => response.json());

        const rawAboutData = await fetch(`${this.channelApiUrl}?key=${apiKey}`, {
          method: 'POST',
          headers: {
            Accept: 'text/html, application/xhtml+xml, application/xml;q=0.9, */*;q=0.8',
            'Content-Type': 'text/html; charset=UTF-8',
            'User-Agent': this.youtubeClientParams.userAgent
          },
          body: JSON.stringify({
            context: {
              client: this.youtubeClientParams
            },
            browseId: channelId,
            params: this.aboutParam
          })
        }).then(response => response.json());

        return ChannelMapper.mapChannel(rawChannelData, rawAboutData);
      } catch (error) {
        throw new InternalServerErrorException(error);
      }
    } else {
      throw new InternalServerErrorException('Error fetching channel');
    }
  }

  async refreshApiKey(): Promise<string | void> {
    const url = 'https://www.youtube.com/channel/UCGkmcEne_L9uynfi44aW4Fw';
    const rawSite = await fetch(url, {
      headers: {
        Accept: 'text/html, application/xhtml+xml, application/xml;q=0.9, */*;q=0.8',
        'Content-Type': 'text/html; charset=UTF-8',
        'User-Agent': this.youtubeClientParams.userAgent
      }
    })
      .then(response => response.text())
      .catch(err => {
        console.log(err);
      });
    if (rawSite) {
      const apiKey = rawSite.match(/"INNERTUBE_API_KEY":"(.*?)",/im)[1];
      await this.generalModel
        .findOneAndUpdate({ version: 1 }, { innertubeApiKey: apiKey }, { upsert: true })
        .exec();
      return apiKey;
    }
    return null;
  }
}
