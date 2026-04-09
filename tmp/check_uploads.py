import paramiko
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('72.60.1.86', username='root', password='49618553Bmb328873.')
stdin, stdout, stderr = ssh.exec_command('curl -s -o /dev/null -w "%{http_code}" https://syndra.aivanguardlabs.com/uploads/ 2>&1', timeout=15)
print("Status /uploads/:", stdout.read().decode())
# Also check the API logs for static assets setup
stdin2, stdout2, stderr2 = ssh.exec_command('docker logs syndra-api 2>&1 | tail -5', timeout=15)
print("API logs:", stdout2.read().decode())
ssh.close()
