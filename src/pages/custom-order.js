import CustomOrderForm from '@/components/CustomOrderForm';

export default function CustomOrderPage() {
  return (
    <main className="min-h-screen bg-gray-100 py-10 px-4">
      <h1 className="text-3xl font-bold text-center mb-6 text-purple-700">
        Custom Order Form
      </h1>
      <CustomOrderForm />
    </main>
  );
}
