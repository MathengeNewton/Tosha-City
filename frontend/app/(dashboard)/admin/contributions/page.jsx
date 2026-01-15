// app/(dashboard)/admin/contributions/page.jsx
// Contributions page: List with campaign name, deposits/installments (monthly).
// Mock data. Table view.

"use client";

const mockContributions = [
  {
    id: 1,
    member: "John Kamau",
    campaign: "Buy Church Van",
    installment: "KES 5,000/month",
    totalPaid: "KES 30,000",
    due: "KES 20,000",
  },
  {
    id: 2,
    member: "Mary Wanjiku",
    campaign: "Build Sunday School Hall",
    installment: "KES 10,000/month",
    totalPaid: "KES 50,000",
    due: "KES 0",
  },
  // Add more
];

const ContributionsPage = () => {
  return (
    <div className="w-full space-y-8 bg-gray-50 min-h-screen p-6">
      <div className="mb-8">
        <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">
          Contributions Management
        </h1>
        <p className="text-gray-600 mt-1">
          View PCEA contributions and installments
        </p>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <h3 className="text-lg font-semibold mb-4 text-gray-800">
          Contribution List
        </h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Member
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Campaign
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Installment
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Paid
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Due
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {mockContributions.map((contrib) => (
                <tr key={contrib.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {contrib.member}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {contrib.campaign}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {contrib.installment}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {contrib.totalPaid}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {contrib.due}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ContributionsPage;
