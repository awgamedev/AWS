using System.Diagnostics;

namespace AWSManageConsole.Helper;

public static class BashHelper
{
	public static string ExecuteBashCommandWithOutput(this string command)
	{
		ProcessStartInfo processInfo = new("powershell", $"-c \"{command}\"")
		{
			RedirectStandardOutput = true,
			RedirectStandardError = true,
			UseShellExecute = false,
			CreateNoWindow = true,
		};
		using Process process = new()
		{
			StartInfo = processInfo
		};
		process.Start();
		string output = process.StandardOutput.ReadToEnd();
		string error = process.StandardError.ReadToEnd();
		process.WaitForExit();
		if (!string.IsNullOrEmpty(error))
		{
			error.WriteError();
		}
		return output;
	}

	public static void ExecuteBashCommand(this string command)
	{
		ProcessStartInfo processInfo = new("bash", $"-c \"{command}\"")
		{
			RedirectStandardOutput = true,
			RedirectStandardError = true,
			UseShellExecute = false,
			CreateNoWindow = true,
		};
		using Process process = new()
		{
			StartInfo = processInfo
		};
		process.Start();
		string output = process.StandardOutput.ReadToEnd();
		string error = process.StandardError.ReadToEnd();
		process.WaitForExit();
		if (!string.IsNullOrEmpty(output))
		{
			output.WriteInfo();
		}
		if (!string.IsNullOrEmpty(error))
		{
			error.WriteError();
		}
	}
}
