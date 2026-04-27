import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

// Contact form validation schema
const contactSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  email: z.string().email('Invalid email address'),
  phone: z.string().optional(),
  message: z.string().min(10, 'Message must be at least 10 characters').max(5000),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate the request body
    const validationResult = contactSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: validationResult.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { name, email, phone, message } = validationResult.data;

    // In a production environment, you would:
    // 1. Store the contact message in the database
    // 2. Send an email notification to the support team
    // 3. Send a confirmation email to the user

    // For now, we'll log the contact submission
    console.log('Contact form submission:', {
      name,
      email,
      phone: phone || 'Not provided',
      message,
      timestamp: new Date().toISOString(),
    });

    // TODO: Implement email sending with a service like:
    // - Resend
    // - SendGrid
    // - Nodemailer
    
    // TODO: Store in database if you have a ContactMessage model

    return NextResponse.json(
      {
        success: true,
        message: 'Contact message received successfully',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Contact form error:', error);
    return NextResponse.json(
      {
        error: 'An error occurred while processing your message',
      },
      { status: 500 }
    );
  }
}

// GET endpoint to check if the contact endpoint is available
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    message: 'Contact endpoint is available',
  });
}
