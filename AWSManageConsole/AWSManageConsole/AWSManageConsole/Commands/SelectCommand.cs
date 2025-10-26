using System.Reflection;

namespace AWSManageConsole.Commands;

internal class SelectCommand : BaseCommand
{
	public SelectCommand(IServiceProvider serviceProvider) : base(serviceProvider) { }

	public override string Name => "Select and Execute a Command";

	public override async Task ExecuteAsync()
	{
		List<BaseCommand> availableCommands = GetAvailableCommands();
		BaseCommand selectedCommand = availableCommands
			.SelectAnOptionFromList("Select a command to execute:", c => c.Name);

		Console.WriteLine();
		"Executing Command:".Write(ConsoleColor.Cyan);
		$" {selectedCommand.Name}".WriteInfo();
		Console.WriteLine();

		await selectedCommand.ExecuteAsync();

		if (selectedCommand.Name != "Clear Console")
		{
			Console.WriteLine();
		}

		SelectCommand selectCommand = new(_serviceProvider);
		await selectCommand.ExecuteAsync();
	}

	private List<BaseCommand> GetAvailableCommands()
	{
		List<BaseCommand> commands = new();

		Assembly asm = Assembly.GetExecutingAssembly();
		Type baseType = typeof(BaseCommand);
		Type currentType = typeof(SelectCommand);

		IEnumerable<Type> commandTypes = asm.GetTypes()
			.Where(t => t.IsClass
						&& !t.IsAbstract
						&& baseType.IsAssignableFrom(t)
						&& t != currentType);

		foreach (Type t in commandTypes)
		{
			try
			{
				// Try to create instance, allow non-public parameterless constructors
				object? instance = Activator.CreateInstance(t, _serviceProvider);
				if (instance is BaseCommand cmd)
				{
					commands.Add(cmd);
				}
			}
			catch (Exception e)
			{
				e.Message.WriteError();
			}
		}

		commands.Sort((a, b) => string.Compare(a.Name, b.Name, StringComparison.Ordinal));

		return commands;
	}
}
