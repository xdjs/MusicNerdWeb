import Link from "next/link";

export default function UnauthorizedPage() {
  return (
    <div className="container mx-auto py-12 text-center">
      <h1 className="text-4xl font-bold mb-4">401 Unauthorized</h1>
      <p className="text-gray-600 mb-8">
        Authentication is currently disabled. Please check back later.
      </p>
      <Link href="/" className="text-blue-600 hover:underline">
        Return to Home
      </Link>
    </div>
  );
}
