import express from 'express';
import partController from '../controllers/partController.js';

import partValidates from '../validates/partValidate.js';

const router = express.Router();

router.post('/',partValidates.createPart ,partController.createPart);

router.get('/', partController.getParts);

router.get('/:part_id', partController.getPartById);

router.patch('/:part_id', partController.updatePart);

router.delete('/:part_id', partController.deletePart);



export default router;