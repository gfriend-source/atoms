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

    const messages = await prisma.chatMessage.findMany({
      where: { projectId: id },
      orderBy: { createdAt: 'asc' }
    })

    return NextResponse.json(messages)
  } catch {
    return NextResponse.json(
      { error: '获取消息失败' },
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
    const body = await req.json()

    // Verify project ownership
    const project = await prisma.project.findFirst({
      where: { id, userId: session.user.id }
    })

    if (!project) {
      return NextResponse.json({ error: '项目不存在' }, { status: 404 })
    }

    const message = await prisma.chatMessage.create({
      data: {
        projectId: id,
        role: body.role,
        content: body.content,
        agent: body.agent || null,
        agentRole: body.agentRole || null,
        steps: body.steps ? JSON.stringify(body.steps) : null,
      }
    })

    return NextResponse.json(message)
  } catch {
    return NextResponse.json(
      { error: '保存消息失败' },
      { status: 500 }
    )
  }
}
