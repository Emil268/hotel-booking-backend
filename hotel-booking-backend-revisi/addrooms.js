const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const Room = require('./models/Room');
const Hotel = require('./models/Hotel');

const createRoom = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    // 1. Buat data Hotel valid (termasuk field location)
    const hotel = await Hotel.create({
      name: "Hotel Grand Indonesia",
      location: "Jakarta",
      address: "Jl. M.H. Thamrin No. 1",
      city: "Jakarta",
      phone: "08123456789"
    });

    // 2. Buat Kamar yang terhubung ke ID Hotel tersebut
    const newRoom = await Room.create({
      roomNumber: "101",
      roomType: "Deluxe",
      pricePerNight: 350000,
      hotelId: hotel._id,
      isAvailable: true
    });

    console.log("====================================");
    console.log("BERHASIL! ID Kamar Baru kamu adalah:");
    console.log(newRoom._id.toString());
    console.log("====================================");

    process.exit();
  } catch (error) {
    console.error("Gagal:", error.message);
    process.exit(1);
  }
};

createRoom();