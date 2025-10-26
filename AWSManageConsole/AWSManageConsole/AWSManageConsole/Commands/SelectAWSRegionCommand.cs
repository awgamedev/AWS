namespace AWSManageConsole.Commands;

internal class SelectAWSRegionCommand : BaseCommand
{
	public override string Name => "Select AWS Region";

	public override async Task ExecuteAsync()
	{
		string[] regions = "aws ec2 describe-regions --query 'Regions[].RegionName' --output text"
			.ExecuteBashCommandWithOutput()
			.Split('\t');

		string region = regions.SelectAnOptionFromList("Select an AWS region:");
	}
}
