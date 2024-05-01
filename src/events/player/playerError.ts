import { BaseGuildTextChannel, EmbedBuilder } from "discord.js";
import { randomUUID as uuidv4 } from "node:crypto";
import { loggerService, Logger } from "@services/logger.service";
import { ExtendedGuildQueuePlayerNode } from "@typings/event";
import { useLanguageTranslator } from "@utils/useLanguageTranslator";
import { embedOptions} from "@common/embedOptions"
import { botOptions} from "@common/botOptions"
import { systemOptions} from "@common/systemOptions"
 
// Emitted when the player encounters an error while streaming audio track
export default {
  name: "playerError",
  isDebug: false,
  isPlayerEvent: true,
  execute: async (queue: ExtendedGuildQueuePlayerNode, error: Error) => {
    const executionId: string = uuidv4();
    const logger: Logger = loggerService.child({
      module: "event",
      name: "playerError",
      executionId: executionId,
      shardId: queue.metadata?.client.shard?.ids[0],
      guildId: queue.metadata?.channel.guild.id,
    });

    const language =
      queue.metadata?.client.guilds.cache.get(queue.metadata?.channel.guild.id)
        ?.preferredLocale ?? "en-US";
    const translator = useLanguageTranslator(language);

    if (error.message.includes("Could not extract stream for this track")) {
      // handled in playerSkip event where we have access to track object
      return;
    }

    logger.error(
      error,
      "player.events.on('playerError'): Player error while streaming track"
    );

    await queue.metadata?.channel.send({
      embeds: [
        new EmbedBuilder()
          .setDescription(
            translator("errors.cannotPlayAudioStream", {
              icon: embedOptions.icons.error,
              serverInviteUrl: botOptions.serverInviteUrl,
            })
          )
          .setColor(embedOptions.colors.error)
          .setFooter({
            text: translator("errors.footerExecutionId", {
              executionId: executionId,
            }),
          }),
      ],
    });

    if (systemOptions.systemMessageChannelId && systemOptions.systemUserId) {
      const channel: BaseGuildTextChannel =
        queue.metadata?.client.channels.cache.get(
          systemOptions.systemMessageChannelId
        ) as BaseGuildTextChannel;
      if (channel) {
        await channel.send({
          embeds: [
            new EmbedBuilder()
              .setDescription(
                translator("systemMessages.playerError", {
                  icon: embedOptions.icons.error,
                  message: error.message,
                  userId: systemOptions.systemUserId,
                })
              )
              .setColor(embedOptions.colors.error)
              .setFooter({
                text: translator("errors.footerExecutionId", {
                  executionId: executionId,
                }),
              }),
          ],
        });
      }
    }
  },
};