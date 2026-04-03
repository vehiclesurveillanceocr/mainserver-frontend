import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 30;

interface Detection {
  timestamp: string;
  plate: string;
  country: string;
  make: string;
  model: string;
  color: string;
  category: string;
}

const MOCK_DETECTIONS: Record<string, Detection[]> = {
  SAS: [
    {
      timestamp: new Date().toISOString(),
      plate: "KA01AB1234",
      country: "IN",
      make: "Toyota",
      model: "Innova",
      color: "White",
      category: "SUV",
    },
    {
      timestamp: new Date(Date.now() - 15_000).toISOString(),
      plate: "TN09CD5678",
      country: "IN",
      make: "Honda",
      model: "City",
      color: "Black",
      category: "Sedan",
    },
  ],
  EUR: [
    {
      timestamp: new Date().toISOString(),
      plate: "B-AB1234",
      country: "DE",
      make: "BMW",
      model: "320d",
      color: "Blue",
      category: "Sedan",
    },
  ],
  NAM: [
    {
      timestamp: new Date().toISOString(),
      plate: "8ABC123",
      country: "US",
      make: "Ford",
      model: "Explorer",
      color: "Black",
      category: "SUV",
    },
  ],
  AFR: [
    {
      timestamp: new Date().toISOString(),
      plate: "CA123456",
      country: "ZA",
      make: "Toyota",
      model: "Hilux",
      color: "Silver",
      category: "Pickup",
    },
  ],
};

export async function POST(request: NextRequest): Promise<NextResponse> {
  const formData = await request.formData();
  const videoFile = formData.get("video");
  const region = String(formData.get("region") ?? "SAS").toUpperCase();

  if (!videoFile || !(videoFile instanceof File)) {
    return NextResponse.json(
      { success: false, error: "No video file provided" },
      { status: 400 },
    );
  }

  const detections = MOCK_DETECTIONS[region] ?? MOCK_DETECTIONS.SAS;

  return NextResponse.json({
    success: true,
    detections,
    framesProcessed: 12,
    duration: 1.2,
  });
}
