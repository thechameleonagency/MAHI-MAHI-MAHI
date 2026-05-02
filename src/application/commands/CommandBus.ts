import type { Command, CommandHandler, CommandResult } from "@/application/commands/types";

export class CommandBus {
  private handlers = new Map<string, CommandHandler>();

  register<TCommand extends Command, TResult>(commandType: string, handler: CommandHandler<TCommand, TResult>): void {
    this.handlers.set(commandType, handler as CommandHandler);
  }

  async execute<TResult>(command: Command): Promise<CommandResult<TResult>> {
    const handler = this.handlers.get(command.type);
    if (!handler) {
      return {
        ok: false,
        errorCode: "COMMAND_HANDLER_NOT_FOUND",
        message: `No command handler registered for ${command.type}`,
      };
    }

    return handler(command) as Promise<CommandResult<TResult>>;
  }
}
