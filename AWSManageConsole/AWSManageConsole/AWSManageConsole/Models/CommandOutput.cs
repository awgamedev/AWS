using Amazon.SimpleSystemsManagement;

namespace AWSManageConsole.Models;

internal class CommandOutput
{
	public CommandOutput(CommandInvocationStatus status, string standardOutputContent, string standardErrorContent)
	{
		Status = status;
		StandardOutputContent = standardOutputContent;
		StandardErrorContent = standardErrorContent;
	}

	public CommandInvocationStatus Status { get; internal set; }
	public string StandardOutputContent { get; set; }
	public string StandardErrorContent { get; set; }
}
