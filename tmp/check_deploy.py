import paramiko
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('72.60.1.86', username='root', password='49618553Bmb328873.')
stdin, stdout, stderr = ssh.exec_command('cd /opt/syndra && docker compose -f docker-compose.prod.yml ps', timeout=30)
print(stdout.read().decode())
ssh.close()
