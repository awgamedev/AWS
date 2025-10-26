namespace AWSManageConsole.Helper;

internal static class ConsoleHelper
{
	public static void WriteLine(this string message, ConsoleColor color = ConsoleColor.White)
	{
		ConsoleColor previousColor = Console.ForegroundColor;
		Console.ForegroundColor = color;
		Console.WriteLine(message);
		Console.ForegroundColor = previousColor;
	}

	public static void Write(this string message, ConsoleColor color = ConsoleColor.White)
	{
		ConsoleColor previousColor = Console.ForegroundColor;
		Console.ForegroundColor = color;
		Console.Write(message);
		Console.ForegroundColor = previousColor;
	}

	public static void WriteError(this string message)
	{
		WriteLine(message, ConsoleColor.Red);
	}

	public static void WriteSuccess(this string message)
	{
		WriteLine(message, ConsoleColor.Green);
	}

	public static void WriteWarning(this string message)
	{
		WriteLine(message, ConsoleColor.Yellow);
	}

	public static void WriteInfo(this string message)
	{
		WriteLine(message, ConsoleColor.White);
	}

	public static T ReadValue<T>(this string prompt, ConsoleColor promptColor = ConsoleColor.Green)
	{
		while (true)
		{
			prompt.Write(promptColor);
			string? input = Console.ReadLine();
			try
			{
				if (input is null)
				{
					throw new InvalidOperationException("Input cannot be null.");
				}

				T value = (T)Convert.ChangeType(input, typeof(T));
				return value;
			}
			catch (Exception)
			{
				"Invalid input. Please try again.".WriteError();
			}
		}
	}

	public static void WaitForKeyPress(this string prompt)
	{
		prompt.Write(ConsoleColor.Yellow);
		Console.ReadKey();
	}

	public static bool ConfirmAction(this string prompt)
	{
		while (true)
		{
			string input = prompt + " (y/n): ";
			string response = input.ReadValue<string>().ToLower();
			if (response == "y")
			{
				return true;
			}
			else if (response == "n")
			{
				return false;
			}
			else
			{
				"Invalid input. Please enter 'y' or 'n'.".WriteError();
			}
		}
	}

	public static T SelectAnOptionFromList<T>(this IEnumerable<T> options, string prompt, Func<T, string>? displaySelector = null)
	{
		while (true)
		{
			prompt.WriteLine(ConsoleColor.Cyan);

			for (int i = 0; i < options.Count(); i++)
			{
				$"[{i + 1}]".Write(ConsoleColor.Yellow);
				if (displaySelector != null)
				{
					$" {displaySelector(options.ElementAt(i))}".WriteLine(ConsoleColor.White);
				}
				else
				{
					$" {options.ElementAt(i)}".WriteLine(ConsoleColor.White);
				}
			}

			int selectedIndex = "Eingabe: ".ReadValue<int>();
			if (selectedIndex >= 1 &&
				selectedIndex <= options.Count())
			{
				return options.ElementAt(selectedIndex - 1);
			}
			else
			{
				"Invalid selection. Please try again.".WriteError();
			}
		}
	}

	public static List<T> SelectOptionsFromList<T>(this IEnumerable<T> options, string prompt, Func<T, string>? displaySelector = null)
	{
		while (true)
		{
			prompt.WriteLine(ConsoleColor.Cyan);
			for (int i = 0; i < options.Count(); i++)
			{
				$"[{i + 1}]".Write(ConsoleColor.Yellow);
				if (displaySelector != null)
				{
					$" {displaySelector(options.ElementAt(i))}".WriteLine(ConsoleColor.White);
				}
				else
				{
					$" {options.ElementAt(i)}".WriteLine(ConsoleColor.White);
				}
			}
			string input = "Enter selections as comma-separated numbers (e.g., 1,3,4): ".ReadValue<string>();
			string[] parts = input.Split(',', StringSplitOptions.RemoveEmptyEntries);
			List<T> selectedOptions = new();
			bool allValid = true;
			foreach (string part in parts)
			{
				if (int.TryParse(part.Trim(), out int selectedIndex) &&
					selectedIndex >= 1 &&
					selectedIndex <= options.Count())
				{
					selectedOptions.Add(options.ElementAt(selectedIndex - 1));
				}
				else
				{
					allValid = false;
					break;
				}
			}
			if (allValid && selectedOptions.Count > 0)
			{
				return selectedOptions;
			}
			else
			{
				"Invalid selection(s). Please try again.".WriteError();
			}
		}
	}

	public static void PrintTable(this IEnumerable<string[]> rows, bool isFirstRowHeader = true)
	{
		if (rows is null || !rows.Any())
		{
			return;
		}

		// Determine number of columns (max row length)
		int columnCount = rows.Max(r => r?.Length ?? 0);
		if (columnCount == 0)
		{
			return;
		}

		// Compute maximum width for each column
		int[] columnWidths = new int[columnCount];
		for (int c = 0; c < columnCount; c++)
		{
			int max = 0;
			foreach (string[] row in rows)
			{
				if (row == null) continue;
				if (c < row.Length && row[c] != null)
				{
					int len = row[c].Length;
					if (len > max) max = len;
				}
			}
			// Ensure at least width 1 to avoid zero-length oddities
			columnWidths[c] = Math.Max(1, max);
		}

		for (int rowIndex = 0; rowIndex < rows.Count(); rowIndex++)
		{
			string[] row = rows.ElementAt(rowIndex) ?? Array.Empty<string>();
			bool headerRow = isFirstRowHeader && rowIndex == 0;

			// Print row with leading and trailing separators
			" | ".Write(ConsoleColor.White);
			for (int c = 0; c < columnCount; c++)
			{
				string cell = c < row.Length && row[c] != null ? row[c] : string.Empty;
				string padded = cell.PadRight(columnWidths[c]);
				padded.Write(headerRow ? ConsoleColor.Yellow : ConsoleColor.White);

				// Column separator always " | " (including after the last column)
				" | ".Write(ConsoleColor.White);
			}
			Console.WriteLine();

			// After printing header row, print separator line of dashes matching column widths with leading/trailing separators
			if (headerRow)
			{
				" | ".Write(ConsoleColor.White);
				for (int c = 0; c < columnCount; c++)
				{
					string dashes = new('-', columnWidths[c]);
					dashes.Write(ConsoleColor.White);
					" | ".Write(ConsoleColor.White);
				}
				Console.WriteLine();

				// Only the first row is the header
				isFirstRowHeader = false;
			}
		}
	}
}
