class CommandRegistryClass {
  commands = new Map();
  aliases = new Map();

  register(command) {
    this.commands.set(command.name.toLowerCase(), command);

    if (command.aliases) {
      for (const alias of command.aliases) {
        this.aliases.set(alias.toLowerCase(), command.name.toLowerCase());
      }
    }

    console.log(`[CommandRegistry] Registered command: ${command.name}`);
  }

  unregister(name) {
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

  get(name) | undefined {
    const normalizedName = name.toLowerCase();
    const resolved = this.aliases.get(normalizedName) || normalizedName;
    return this.commands.get(resolved);
  }

  has(name) {
    const normalizedName = name.toLowerCase();
    return this.commands.has(normalizedName) || this.aliases.has(normalizedName);
  }

  getAll() {
    return Array.from(this.commands.values());
  }

  clear() {
    this.commands.clear();
    this.aliases.clear();
  }
}

export const CommandRegistry = new CommandRegistryClass();
