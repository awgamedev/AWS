namespace AWSManageConsole.Commands;

internal class StartAWSEC2InstanceCommand : BaseCommand
{
	public override string Name => "Start AWS EC2 Instance";

	public override async Task ExecuteAsync()
	{
		SelectAWSRegionCommand selectRegionCommand = new();
		await selectRegionCommand.ExecuteAsync();

		//$@"aws ec2 run-instances
		//	--region REGION
		//	--image-id AMI_ID
		//	--instance-type INSTANCE_TYPE
		//	--key-name KEY_NAME # Name des Schlüsselpaares
		//	--security-group-ids SECURITY_GROUP_ID
		//	--subnet-id SUBNET_ID
		//	--tag-specifications ""ResourceType=instance,Tags=[{{Key=Name,Value=INSTANCE_NAME}}]"""
		//.ExecuteBashCommand();
	}
}
