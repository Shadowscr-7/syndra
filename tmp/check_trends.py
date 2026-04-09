import paramiko
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('72.60.1.86', username='root', password='49618553Bmb328873.')
cmds = [
    "docker exec syndra-web sh -c 'find /app/apps/web/.next -type f -name \"*.js\" -exec grep -l \"api/trends\" {} \\; 2>/dev/null | head -5'",
    "docker exec syndra-web sh -c 'grep -r \"syndra.aivanguardlabs\" /app/apps/web/.next/static/ 2>/dev/null | head -3'",
    "docker exec syndra-web sh -c 'grep -r \"NEXT_PUBLIC_API_URL\\|api/trends\" /app/apps/web/.next/server/ 2>/dev/null | head -5'",
]
for cmd in cmds:
    print(f">>> {cmd.strip()}")
    stdin, stdout, stderr = ssh.exec_command(cmd, timeout=30)
    out = stdout.read().decode()
    err = stderr.read().decode()
    if out: print(out)
    if err and 'WARNING' not in err: print("STDERR:", err)
    print()
ssh.close()
print("Done!")
