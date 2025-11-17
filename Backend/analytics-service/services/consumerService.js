const amqp = require('amqplib');
const AnalyticsClaim = require('../model/AnalyticsClaim');

const connectRabbitMQ = async () => {
  try {
    const connection = await amqp.connect(process.env.RABBITMQ_URL);
    const channel = await connection.createChannel();
    const queue = 'analytics_queue';

    await channel.assertQueue(queue, { durable: true });
    console.log(`🎧 RabbitMQ Connected. Waiting for events in '${queue}'...`);

    channel.consume(queue, async (msg) => {
      if (msg !== null) {
        const content = JSON.parse(msg.content.toString());
        console.log("📩 Event Received:", content.type);

        // Xử lý sự kiện TẠO MỚI hoặc CẬP NHẬT Claim
        if (content.type === 'CLAIM_CREATED' || content.type === 'CLAIM_UPDATED') {
          const data = content.payload;
          
          // Upsert: Có thì cập nhật, chưa có thì tạo mới
          await AnalyticsClaim.findOneAndUpdate(
            { originalClaimId: data.claimId }, 
            {
              model: data.vehicleModel, // Mapping trường dữ liệu cho khớp
              partName: data.partName,
              region: data.region || 'Unknown',
              repairCost: data.totalCost,
              failureDate: new Date(data.createdAt),
              errorDescription: data.description,
              status: data.status
            },
            { upsert: true, new: true }
          );
        }
        channel.ack(msg);
      }
    });
  } catch (error) {
    console.error("❌ RabbitMQ Connection Failed:", error.message);
    setTimeout(connectRabbitMQ, 5000); // Thử lại sau 5s nếu rớt mạng
  }
};

module.exports = connectRabbitMQ;
