import type { ActorContext } from "@/domain/entities/identity";

export interface Command<TPayload = unknown> extends ActorContext {
  type: string;
  payload: TPayload;
}

export type CommandSuccess<TResult> = {
  ok: true;
  result: TResult;
  domainEvents: string[];
};

export type CommandFailure = {
  ok: false;
  errorCode: string;
  message: string;
};

export type CommandResult<TResult = unknown> = CommandSuccess<TResult> | CommandFailure;

export type CommandHandler<TCommand extends Command = Command, TResult = unknown> = (
  command: TCommand,
) => Promise<CommandResult<TResult>> | CommandResult<TResult>;
