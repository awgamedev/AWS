namespace AWSManageConsole.Commands.AWS.SecurityGroups;

internal class AddRuleToSecurityGroupCommand : BaseCommand
{
	public AddRuleToSecurityGroupCommand(IServiceProvider serviceProvider) : base(serviceProvider) { }
	public override string Name => "[Security Group] Add Rule to a Security Group";
	public override async Task ExecuteAsync()
	{
		string securityGroupId = "Enter the Security Group ID to add a rule to: ".ReadValue<string>();
		if (string.IsNullOrWhiteSpace(securityGroupId))
		{
			"Security Group ID cannot be empty. Operation cancelled.".WriteError();
			return;
		}

		GetSecurityGroupDetailsCommand getDetailsCommand = new(_serviceProvider);
		await getDetailsCommand.GetSecurityGroupDetails(securityGroupId);

		string protocol = "Enter the protocol (e.g., tcp, udp, -1 for all): ".ReadValue<string>();
		int fromPort = "Enter the starting port number: ".ReadValue<int>();
		int toPort = "Enter the ending port number: ".ReadValue<int>();
		string cidrIp = "Enter the CIDR IP range (e.g., 0.0.0.0/0): ".ReadValue<string>();

		AmazonEC2Client ec2Client = _awsService.GetEC2Client();
		IpPermission ipPermission = new()
		{
			IpProtocol = protocol,
			FromPort = fromPort,
			ToPort = toPort,
			Ipv4Ranges = new List<IpRange>
			{
				new() { CidrIp = cidrIp }
			}
		};
		AuthorizeSecurityGroupIngressRequest request = new()
		{
			GroupId = securityGroupId,
			IpPermissions = new List<IpPermission> { ipPermission }
		};
		try
		{
			if ("Sure you want to add this rule to the Security Group?".ConfirmAction())
			{
				await ec2Client.AuthorizeSecurityGroupIngressAsync(request);
				$"Successfully added rule to Security Group with ID {securityGroupId}.".WriteSuccess();
			}
			else
			{
				"Operation cancelled by user.".WriteInfo();
			}

			if ("Do you want to add another rule?".ConfirmAction())
			{
				await ExecuteAsync();
			}
		}
		catch (Exception ex)
		{
			ex.Message.WriteError();
		}
	}
}

internal class RemoveRulesFromSecurityGroupCommand : BaseCommand
{
	public RemoveRulesFromSecurityGroupCommand(IServiceProvider serviceProvider) : base(serviceProvider) { }
	public override string Name => "[Security Group] Remove Rules from a Security Group";
	public override async Task ExecuteAsync()
	{
		string securityGroupId = "Enter the Security Group ID to remove a rule from: ".ReadValue<string>();
		if (string.IsNullOrWhiteSpace(securityGroupId))
		{
			"Security Group ID cannot be empty. Operation cancelled.".WriteError();
			return;
		}

		AmazonEC2Client ec2Client = _awsService.GetEC2Client();

		List<IpPermission> ipPermissions = new();
		DescribeSecurityGroupsResponse describeSecurityGroupsResponse = await ec2Client.DescribeSecurityGroupsAsync(new DescribeSecurityGroupsRequest
		{
			GroupIds = new List<string> { securityGroupId }
		});

		ipPermissions = describeSecurityGroupsResponse.SecurityGroups
			.FirstOrDefault(sg => sg.GroupId == securityGroupId)?
			.IpPermissions ?? new List<IpPermission>();

		List<IpPermission> selectedIpPermissions = ipPermissions.SelectOptionsFromList("Select a rule to remove: ", ipPermission =>
		{
			string cidrIps = string.Join(", ", ipPermission.Ipv4Ranges.Select(r => r.CidrIp));
			return $"Protocol: {ipPermission.IpProtocol}, From Port: {ipPermission.FromPort?.ToString() ?? "All"}, To Port: {ipPermission.ToPort?.ToString() ?? "All"}, Cidr IPs: {cidrIps}";
		});

		// For simplicity, we'll just remove all inbound rules in this example
		RevokeSecurityGroupIngressRequest request = new()
		{
			GroupId = securityGroupId,
			IpPermissions = selectedIpPermissions
		};
		try
		{
			if ("Sure you want to remove the selected rules from the Security Group?".ConfirmAction())
			{
				await ec2Client.RevokeSecurityGroupIngressAsync(request);
				$"Successfully removed rules from Security Group with ID {securityGroupId}.".WriteSuccess();
			}
			else
			{
				"Operation cancelled by user.".WriteInfo();
			}
		}
		catch (Exception ex)
		{
			ex.Message.WriteError();
		}
	}
}
