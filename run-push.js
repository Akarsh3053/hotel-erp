import { spawn } from 'child_process';

const child = spawn('npx', ['drizzle-kit', 'push'], { stdio: ['pipe', 'pipe', 'pipe'] });

child.stdout.on('data', (data) => {
  const output = data.toString();
  process.stdout.write(output);
  if (output.includes('truncate')) {
    child.stdin.write('n\n');
  }
});

child.stderr.on('data', (data) => {
  process.stderr.write(data.toString());
});

child.on('close', (code) => {
  console.log(`Exited with ${code}`);
});
