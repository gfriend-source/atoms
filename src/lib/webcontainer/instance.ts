import { WebContainer } from '@webcontainer/api'

let webcontainerInstance: WebContainer | null = null

export async function getWebContainerInstance(): Promise<WebContainer> {
  if (!webcontainerInstance) {
    webcontainerInstance = await WebContainer.boot()
  }
  return webcontainerInstance
}

export async function mountFiles(instance: WebContainer, files: Record<string, any>) {
  await instance.mount(files)
}

export async function installDependencies(
  instance: WebContainer,
  onOutput?: (data: string) => void
): Promise<{ output: string; exitCode: number }> {
  const installProcess = await instance.spawn('npm', ['install'])
  let output = ''
  installProcess.output.pipeTo(
    new WritableStream({
      write(data) {
        output += data
        onOutput?.(data)
      },
    })
  )
  const exitCode = await installProcess.exit
  return { output, exitCode }
}

export async function startDevServer(
  instance: WebContainer,
  onOutput?: (data: string) => void
): Promise<{ url: string; output: string }> {
  const serverProcess = await instance.spawn('npm', ['run', 'dev'])
  let output = ''
  serverProcess.output.pipeTo(
    new WritableStream({
      write(data) {
        output += data
        onOutput?.(data)
      },
    })
  )

  return new Promise((resolve) => {
    instance.on('server-ready', (port, url) => {
      resolve({ url, output })
    })
  })
}
