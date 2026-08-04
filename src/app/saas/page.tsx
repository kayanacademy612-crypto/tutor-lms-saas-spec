import { NextResponse } from 'next/server';

export function GET() {
  return NextResponse.redirect('http://127.0.0.1:4280/');
}
