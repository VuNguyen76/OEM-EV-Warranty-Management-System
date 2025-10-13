// shared/services/PDFGenerationService.js
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const axios = require('axios');

class PDFGenerationService {
  /**
   * Generate warranty document PDF
   * @param {Object} claim - Warranty claim object (populated)
   * @param {String} outputPath - Output file path
   * @returns {Promise<String>} - Path to generated PDF
   */
  async generateWarrantyDocument(claim, outputPath) {
    return new Promise(async (resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: 'A4',
          margins: { top: 50, bottom: 50, left: 50, right: 50 }
        });

        const writeStream = fs.createWriteStream(outputPath);
        doc.pipe(writeStream);

        // Generate PDF content
        await this.addHeader(doc, claim);
        this.addVehicleInfo(doc, claim);
        this.addClaimInfo(doc, claim);
        this.addWorkPerformed(doc, claim);
        this.addPartsReplaced(doc, claim);
        this.addTestResults(doc, claim);
        await this.addResultPhotos(doc, claim);
        this.addHandoverInfo(doc, claim);
        this.addFooter(doc, claim);

        doc.end();

        writeStream.on('finish', () => {
          resolve(outputPath);
        });

        writeStream.on('error', (error) => {
          reject(error);
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Add header section
   */
  async addHeader(doc, claim) {
    doc.fontSize(20)
       .font('Helvetica-Bold')
       .text('HỒ SƠ BẢO HÀNH XE ĐIỆN', { align: 'center' });
    
    doc.moveDown(0.5);
    
    // Service center info
    const serviceCenter = claim.serviceCenterId;
    doc.fontSize(12)
       .font('Helvetica')
       .text(serviceCenter.name, { align: 'center' })
       .text(serviceCenter.address, { align: 'center' })
       .text(`ĐT: ${serviceCenter.phone}`, { align: 'center' });
    
    doc.moveDown(1);
    doc.moveTo(50, doc.y)
       .lineTo(545, doc.y)
       .stroke();
    doc.moveDown(1);
  }

  /**
   * Add vehicle information section
   */
  addVehicleInfo(doc, claim) {
    doc.fontSize(14)
       .font('Helvetica-Bold')
       .text('THÔNG TIN XE');
    
    doc.moveDown(0.5);
    
    doc.fontSize(11)
       .font('Helvetica')
       .text(`Số VIN: ${claim.vin}`, { continued: true })
       .text(`        Biển số: ${claim.licensePlate || 'N/A'}`)
       .text(`Mẫu xe: ${claim.vehicleModelId.modelName} (${claim.vehicleModelId.year})`)
       .text(`Hãng: ${claim.oemId.name}`)
       .text(`Số km: ${claim.currentMileage || 'N/A'} km`);
    
    doc.moveDown(1);
  }

  /**
   * Add claim information section
   */
  addClaimInfo(doc, claim) {
    doc.fontSize(14)
       .font('Helvetica-Bold')
       .text('THÔNG TIN YÊU CẦU BẢO HÀNH');
    
    doc.moveDown(0.5);
    
    const createdDate = new Date(claim.createdAt).toLocaleDateString('vi-VN');
    const completedDate = claim.warrantyResults?.completionInfo?.completedAt 
      ? new Date(claim.warrantyResults.completionInfo.completedAt).toLocaleDateString('vi-VN')
      : 'N/A';
    
    doc.fontSize(11)
       .font('Helvetica')
       .text(`Số hồ sơ: ${claim.claimNumber}`)
       .text(`Ngày tạo: ${createdDate}`)
       .text(`Ngày hoàn thành: ${completedDate}`)
       .text(`Loại bảo hành: ${this.getWarrantyTypeLabel(claim.warrantyType)}`)
       .text(`Mô tả sự cố: ${claim.issueDescription}`);
    
    doc.moveDown(1);
  }

  /**
   * Add work performed section
   */
  addWorkPerformed(doc, claim) {
    doc.fontSize(14)
       .font('Helvetica-Bold')
       .text('CÔNG VIỆC ĐÃ THỰC HIỆN');
    
    doc.moveDown(0.5);
    
    const workSummary = claim.warrantyResults?.completionInfo?.workSummary || 'Không có thông tin';
    
    doc.fontSize(11)
       .font('Helvetica')
       .text(workSummary, { align: 'justify' });
    
    doc.moveDown(1);
  }

  /**
   * Add parts replaced section
   */
  addPartsReplaced(doc, claim) {
    if (!claim.partsTracking || claim.partsTracking.length === 0) {
      return;
    }

    doc.fontSize(14)
       .font('Helvetica-Bold')
       .text('PHỤ TÙNG ĐÃ THAY THẾ');
    
    doc.moveDown(0.5);
    
    // Table header
    const tableTop = doc.y;
    const col1X = 50;
    const col2X = 200;
    const col3X = 350;
    const col4X = 450;
    
    doc.fontSize(10)
       .font('Helvetica-Bold')
       .text('Mã phụ tùng', col1X, tableTop)
       .text('Tên phụ tùng', col2X, tableTop)
       .text('Số lượng', col3X, tableTop)
       .text('Trạng thái', col4X, tableTop);
    
    doc.moveDown(0.5);
    
    // Table rows
    doc.font('Helvetica');
    claim.partsTracking.forEach((part, index) => {
      const y = doc.y;
      doc.text(part.partNumber, col1X, y)
         .text(part.partName, col2X, y)
         .text(part.quantityUsed.toString(), col3X, y)
         .text(part.status, col4X, y);
      doc.moveDown(0.3);
    });
    
    doc.moveDown(1);
  }

  /**
   * Add test results section
   */
  addTestResults(doc, claim) {
    doc.fontSize(14)
       .font('Helvetica-Bold')
       .text('KẾT QUẢ KIỂM TRA');
    
    doc.moveDown(0.5);
    
    const testResults = claim.warrantyResults?.completionInfo?.testResults || 'Không có thông tin';
    
    doc.fontSize(11)
       .font('Helvetica')
       .text(testResults, { align: 'justify' });
    
    doc.moveDown(1);
  }

  /**
   * Add result photos section
   */
  async addResultPhotos(doc, claim) {
    if (!claim.warrantyResults?.resultPhotos || claim.warrantyResults.resultPhotos.length === 0) {
      return;
    }

    doc.addPage();
    
    doc.fontSize(14)
       .font('Helvetica-Bold')
       .text('ẢNH KẾT QUẢ SAU SỬA CHỮA');
    
    doc.moveDown(1);
    
    const photos = claim.warrantyResults.resultPhotos;
    const maxPhotos = Math.min(photos.length, 6); // Limit to 6 photos
    
    for (let i = 0; i < maxPhotos; i++) {
      const photo = photos[i];
      
      try {
        // Download image
        const imageBuffer = await this.downloadImage(photo.url);
        
        // Add image to PDF (max width: 200px)
        const imageX = 50 + (i % 2) * 250;
        const imageY = doc.y + Math.floor(i / 2) * 200;
        
        if (imageY > 650) {
          doc.addPage();
        }
        
        doc.image(imageBuffer, imageX, imageY, {
          fit: [200, 150],
          align: 'center'
        });
        
        // Add description
        doc.fontSize(9)
           .font('Helvetica')
           .text(photo.description, imageX, imageY + 160, {
             width: 200,
             align: 'center'
           });
        
        if (i % 2 === 1) {
          doc.moveDown(12);
        }
      } catch (error) {
        console.error(`Failed to add photo ${i + 1}:`, error);
      }
    }
    
    doc.moveDown(2);
  }

  /**
   * Add handover information section
   */
  addHandoverInfo(doc, claim) {
    doc.addPage();
    
    doc.fontSize(14)
       .font('Helvetica-Bold')
       .text('THÔNG TIN BÀN GIAO XE');
    
    doc.moveDown(0.5);
    
    const handover = claim.warrantyResults?.handoverInfo;
    if (!handover) {
      doc.fontSize(11)
         .font('Helvetica')
         .text('Chưa có thông tin bàn giao');
      return;
    }
    
    const handoverDate = new Date(handover.handoverDate).toLocaleDateString('vi-VN');
    
    doc.fontSize(11)
       .font('Helvetica')
       .text(`Ngày bàn giao: ${handoverDate}`)
       .text(`Tên khách hàng: ${handover.customerName}`)
       .text(`Số điện thoại: ${handover.customerPhone}`)
       .text(`Tình trạng xe: ${this.getVehicleConditionLabel(handover.vehicleCondition)}`)
       .text(`Số km khi bàn giao: ${handover.mileageAtHandover || 'N/A'} km`);
    
    if (handover.notes) {
      doc.moveDown(0.5);
      doc.text(`Ghi chú: ${handover.notes}`);
    }
    
    doc.moveDown(2);
    
    // Signature section
    doc.fontSize(11)
       .font('Helvetica-Bold')
       .text('CHỮ KÝ KHÁCH HÀNG:', 50, doc.y);
    
    if (handover.customerSignature) {
      try {
        // If signature is base64
        if (handover.customerSignature.startsWith('data:image')) {
          const base64Data = handover.customerSignature.split(',')[1];
          const signatureBuffer = Buffer.from(base64Data, 'base64');
          doc.image(signatureBuffer, 50, doc.y + 10, {
            fit: [150, 80]
          });
        }
      } catch (error) {
        console.error('Failed to add signature:', error);
      }
    }
    
    doc.moveDown(8);
  }

  /**
   * Add footer section
   */
  addFooter(doc, claim) {
    const finalNotes = claim.warrantyResults?.completionInfo?.finalNotes;
    if (finalNotes) {
      doc.fontSize(11)
         .font('Helvetica-Bold')
         .text('GHI CHÚ CUỐI CÙNG:');
      doc.fontSize(10)
         .font('Helvetica')
         .text(finalNotes, { align: 'justify' });
      doc.moveDown(2);
    }
    
    // Signatures
    const pageWidth = doc.page.width;
    const col1 = 100;
    const col2 = pageWidth - 200;
    
    doc.fontSize(11)
       .font('Helvetica-Bold')
       .text('KỸ THUẬT VIÊN', col1, doc.y, { width: 150, align: 'center' })
       .text('TRUNG TÂM DỊCH VỤ', col2, doc.y, { width: 150, align: 'center' });
    
    doc.moveDown(4);
    
    doc.fontSize(10)
       .font('Helvetica')
       .text('(Ký và ghi rõ họ tên)', col1, doc.y, { width: 150, align: 'center' })
       .text('(Dấu và ký)', col2, doc.y, { width: 150, align: 'center' });
  }

  /**
   * Helper: Download image from URL
   */
  async downloadImage(url) {
    try {
      const response = await axios.get(url, {
        responseType: 'arraybuffer',
        timeout: 10000
      });
      return Buffer.from(response.data);
    } catch (error) {
      throw new Error(`Failed to download image: ${url}`);
    }
  }

  /**
   * Helper: Get warranty type label
   */
  getWarrantyTypeLabel(type) {
    const labels = {
      battery: 'Bảo hành pin',
      drivetrain: 'Bảo hành hệ thống truyền động',
      general: 'Bảo hành chung',
      extended: 'Bảo hành mở rộng'
    };
    return labels[type] || type;
  }

  /**
   * Helper: Get vehicle condition label
   */
  getVehicleConditionLabel(condition) {
    const labels = {
      excellent: 'Xuất sắc',
      good: 'Tốt',
      fair: 'Khá'
    };
    return labels[condition] || condition;
  }
}

module.exports = new PDFGenerationService();