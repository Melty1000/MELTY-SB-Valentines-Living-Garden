export interface CommandContext {
  userId: string;
  userName: string;
  displayName: string;
  args: string[];
}

export type CommandFunction = (context: CommandContext) => void | Promise<void>;

export interface RegisteredCommand {
  name: string;
  description: string;
  execute: CommandFunction;
  aliases?: string[];
}

class CommandRegistryClass {
  private commands: Map<string, RegisteredCommand> = new Map();
  private aliases: Map<string, string> = new Map();

  register(command: RegisteredCommand): void {
    this.commands.set(command.name.toLowerCase(), command);

    if (command.aliases) {
      for (const alias of command.aliases) {
        this.aliases.set(alias.toLowerCase(), command.name.toLowerCase());
      }
    }

    console.log(`[CommandRegistry] Registered command: ${command.name}`);
  }

  unregister(name: string): boolean {
    const command = this.commands.get(name.toLowerCase());
    if (!command) return false;

    if (command.aliases) {
      for (const alias of command.aliases) {
        this.aliases.delete(alias.toLowerCase());
      }
    }

    this.commands.delete(name.toLowerCase());
    return true;
  }

  get(name: string): RegisteredCommand | undefined {
    const normalizedName = name.toLowerCase();
    const resolved = this.aliases.get(normalizedName) || normalizedName;
    return this.commands.get(resolved);
  }

  has(name: string): boolean {
    const normalizedName = name.toLowerCase();
    return this.commands.has(normalizedName) || this.aliases.has(normalizedName);
  }

  getAll(): RegisteredCommand[] {
    return Array.from(this.commands.values());
  }

  clear(): void {
    this.commands.clear();
    this.aliases.clear();
  }
}

export const CommandRegistry = new CommandRegistryClass();
