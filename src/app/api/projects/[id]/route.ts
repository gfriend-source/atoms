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

    const project = await prisma.project.findFirst({
      where: { id, userId: session.user.id },
      include: {
        files: {
          orderBy: { path: 'asc' }
        },
        messages: {
          orderBy: { createdAt: 'asc' }
        }
      }
    })

    if (!project) {
      return NextResponse.json({ error: '项目不存在' }, { status: 404 })
    }

    return NextResponse.json({ project })
  } catch {
    return NextResponse.json(
      { error: '获取项目详情失败' },
      { status: 500 }
    )
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    const { id } = await params
    const { name, description } = await req.json()

    // Verify ownership
    const existing = await prisma.project.findFirst({
      where: { id, userId: session.user.id }
    })

    if (!existing) {
      return NextResponse.json({ error: '项目不存在' }, { status: 404 })
    }

    const project = await prisma.project.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
      }
    })

    return NextResponse.json({ project })
  } catch {
    return NextResponse.json(
      { error: '更新项目失败' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    const { id } = await params

    // Verify ownership
    const existing = await prisma.project.findFirst({
      where: { id, userId: session.user.id }
    })

    if (!existing) {
      return NextResponse.json({ error: '项目不存在' }, { status: 404 })
    }

    await prisma.project.delete({
      where: { id }
    })

    return NextResponse.json({ message: '项目已删除' })
  } catch {
    return NextResponse.json(
      { error: '删除项目失败' },
      { status: 500 }
    )
  }
}
