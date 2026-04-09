import paramiko
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('72.60.1.86', username='root', password='49618553Bmb328873.')
# List uploaded files
stdin, stdout, stderr = ssh.exec_command('ls -la /opt/syndra/uploads/images/ 2>&1', timeout=10)
print("Files on host:", stdout.read().decode())
# Check inside API container
stdin2, stdout2, stderr2 = ssh.exec_command('docker exec syndra-api ls -la /app/uploads/images/ 2>&1', timeout=10)
print("Files in container:", stdout2.read().decode())
ssh.close()
