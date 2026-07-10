import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    const { id } = await params

    // Verify project ownership
    const project = await prisma.project.findFirst({
      where: { id, userId: session.user.id }
    })

    if (!project) {
      return NextResponse.json({ error: '项目不存在' }, { status: 404 })
    }

    const files = await prisma.projectFile.findMany({
      where: { projectId: id },
      orderBy: { path: 'asc' }
    })

    return NextResponse.json(files)
  } catch {
    return NextResponse.json(
      { error: '获取文件失败' },
      { status: 500 }
    )
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    const { id } = await params
    const { files } = await req.json()

    // Verify project ownership
    const project = await prisma.project.findFirst({
      where: { id, userId: session.user.id }
    })

    if (!project) {
      return NextResponse.json({ error: '项目不存在' }, { status: 404 })
    }

    if (!Array.isArray(files) || files.length === 0) {
      return NextResponse.json({ error: '文件列表为空' }, { status: 400 })
    }

    // Batch upsert files
    for (const file of files) {
      await prisma.projectFile.upsert({
        where: {
          projectId_path: { projectId: id, path: file.path }
        },
        update: {
          content: file.content,
          size: file.content.length,
          updatedAt: new Date(),
        },
        create: {
          projectId: id,
          path: file.path,
          content: file.content,
          size: file.content.length,
        }
      })
    }

    return NextResponse.json({ success: true, count: files.length })
  } catch {
    return NextResponse.json(
      { error: '保存文件失败' },
      { status: 500 }
    )
  }
}
