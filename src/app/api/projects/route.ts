import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    const projects = await prisma.project.findMany({
      where: { userId: session.user.id },
      orderBy: { updatedAt: 'desc' },
      include: {
        _count: {
          select: { messages: true, files: true }
        }
      }
    })

    return NextResponse.json({ projects })
  } catch {
    return NextResponse.json(
      { error: '获取项目列表失败' },
      { status: 500 }
    )
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    const { name, description } = await req.json()

    if (!name) {
      return NextResponse.json(
        { error: '项目名称为必填项' },
        { status: 400 }
      )
    }

    const project = await prisma.project.create({
      data: {
        name,
        description: description || '',
        userId: session.user.id,
      }
    })

    return NextResponse.json({ project }, { status: 201 })
  } catch {
    return NextResponse.json(
      { error: '创建项目失败' },
      { status: 500 }
    )
  }
}
