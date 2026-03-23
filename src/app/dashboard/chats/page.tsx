export default function ChatsPage() {
  return (
    <div className="flex-1 flex items-center justify-center h-full" style={{ minHeight: 'calc(100vh - 0px)' }}>
      <div className="text-center">
        <p className="text-lg font-medium text-gray-700">WhatsApp не подключен.</p>
        <p className="text-sm text-gray-500 mt-1">Обратитесь к администратору.</p>
      </div>
    </div>
  );
}
