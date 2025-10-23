const DoctorCall = require('../models/DoctorCall');
const { formatResponse, formatErrorResponse } = require('../helpers');
const { HTTP_STATUS } = require('../constants');

const parseBooleanLike = (value) => {
    if (value === undefined || value === null || value === '') return undefined;
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return value === 1;
    const normalized = String(value).trim().toLowerCase();
    return normalized === '1' || normalized === 'true' || normalized === 'yes';
};

class DoctorCallController {
    static async list(req, res) {
        try {
            const { representativeId, status } = req.query;
            const filters = {};

            if (representativeId) {
                const numericRep = Number(representativeId);
                if (!Number.isFinite(numericRep)) {
                    const { response, statusCode } = formatErrorResponse(new Error('Invalid representative identifier'), HTTP_STATUS.BAD_REQUEST);
                    return res.status(statusCode).json(response);
                }
                filters.representativeId = numericRep;
            }

            if (status !== undefined) {
                const bool = parseBooleanLike(status);
                if (bool === undefined) {
                    const { response, statusCode } = formatErrorResponse(new Error('Invalid status filter'), HTTP_STATUS.BAD_REQUEST);
                    return res.status(statusCode).json(response);
                }
                filters.status = bool ? 1 : 0;
            }

            const doctors = await DoctorCall.list(filters);
            const { response, statusCode } = formatResponse(true, 'Doctors retrieved successfully', {
                doctors,
                count: doctors.length
            });
            return res.status(statusCode).json(response);
        } catch (error) {
            const { response, statusCode } = formatErrorResponse(error);
            return res.status(statusCode).json(response);
        }
    }

    static async create(req, res) {
        try {
            const {
                representativeId,
                cityId,
                doctorName,
                specialityId,
                address = null,
                status = 1
            } = req.body || {};

            if (!representativeId || !cityId || !doctorName || !specialityId) {
                const { response, statusCode } = formatErrorResponse(new Error('Representative, city, doctor name, and speciality are required'), HTTP_STATUS.BAD_REQUEST);
                return res.status(statusCode).json(response);
            }

            const payload = {
                representativeId: Number(representativeId),
                cityId: Number(cityId),
                doctorName: String(doctorName).trim(),
                specialityId: Number(specialityId),
                address: address ? String(address).trim() : null,
                status: parseBooleanLike(status) === false ? 0 : 1
            };

            if (!Number.isFinite(payload.representativeId) || !Number.isFinite(payload.cityId) || !Number.isFinite(payload.specialityId)) {
                const { response, statusCode } = formatErrorResponse(new Error('Representative, city, and speciality must be valid numbers'), HTTP_STATUS.BAD_REQUEST);
                return res.status(statusCode).json(response);
            }

            if (!payload.doctorName) {
                const { response, statusCode } = formatErrorResponse(new Error('Doctor name cannot be empty'), HTTP_STATUS.BAD_REQUEST);
                return res.status(statusCode).json(response);
            }

            const created = await DoctorCall.create(payload);
            const { response, statusCode } = formatResponse(true, 'Doctor created successfully', { doctor: created }, HTTP_STATUS.CREATED);
            return res.status(statusCode).json(response);
        } catch (error) {
            const { response, statusCode } = formatErrorResponse(error);
            return res.status(statusCode).json(response);
        }
    }

    static async get(req, res) {
        try {
            const { id } = req.params;
            const doctor = await DoctorCall.getById(id);
            if (!doctor) {
                const { response, statusCode } = formatErrorResponse(new Error('Doctor not found'), HTTP_STATUS.NOT_FOUND);
                return res.status(statusCode).json(response);
            }

            const { response, statusCode } = formatResponse(true, 'Doctor retrieved successfully', { doctor });
            return res.status(statusCode).json(response);
        } catch (error) {
            const { response, statusCode } = formatErrorResponse(error);
            return res.status(statusCode).json(response);
        }
    }

    static async update(req, res) {
        try {
            const { id } = req.params;
            const updates = {};

            if (req.body.representativeId !== undefined) {
                const numericRep = Number(req.body.representativeId);
                if (!Number.isFinite(numericRep)) {
                    const { response, statusCode } = formatErrorResponse(new Error('Invalid representative identifier'), HTTP_STATUS.BAD_REQUEST);
                    return res.status(statusCode).json(response);
                }
                updates.representativeId = numericRep;
            }
            if (req.body.cityId !== undefined) {
                const numericCity = Number(req.body.cityId);
                if (!Number.isFinite(numericCity)) {
                    const { response, statusCode } = formatErrorResponse(new Error('Invalid city identifier'), HTTP_STATUS.BAD_REQUEST);
                    return res.status(statusCode).json(response);
                }
                updates.cityId = numericCity;
            }
            if (req.body.doctorName !== undefined) updates.doctorName = String(req.body.doctorName).trim();
            if (req.body.specialityId !== undefined) {
                const numericSpec = Number(req.body.specialityId);
                if (!Number.isFinite(numericSpec)) {
                    const { response, statusCode } = formatErrorResponse(new Error('Invalid speciality identifier'), HTTP_STATUS.BAD_REQUEST);
                    return res.status(statusCode).json(response);
                }
                updates.specialityId = numericSpec;
            }
            if (req.body.address !== undefined) updates.address = req.body.address ? String(req.body.address).trim() : null;
            if (req.body.status !== undefined) {
                const bool = parseBooleanLike(req.body.status);
                if (bool === undefined) {
                    const { response, statusCode } = formatErrorResponse(new Error('Invalid status value'), HTTP_STATUS.BAD_REQUEST);
                    return res.status(statusCode).json(response);
                }
                updates.status = bool ? 1 : 0;
            }

            if (updates.doctorName !== undefined && !updates.doctorName) {
                const { response, statusCode } = formatErrorResponse(new Error('Doctor name cannot be empty'), HTTP_STATUS.BAD_REQUEST);
                return res.status(statusCode).json(response);
            }

            const doctor = await DoctorCall.update(id, updates);
            if (!doctor) {
                const { response, statusCode } = formatErrorResponse(new Error('Doctor not found'), HTTP_STATUS.NOT_FOUND);
                return res.status(statusCode).json(response);
            }

            const { response, statusCode } = formatResponse(true, 'Doctor updated successfully', { doctor });
            return res.status(statusCode).json(response);
        } catch (error) {
            const { response, statusCode } = formatErrorResponse(error);
            return res.status(statusCode).json(response);
        }
    }

    static async setStatus(req, res) {
        try {
            const { id } = req.params;
            const { active } = req.body || {};
            const bool = parseBooleanLike(active);
            if (bool === undefined) {
                const { response, statusCode } = formatErrorResponse(new Error('Invalid active flag'), HTTP_STATUS.BAD_REQUEST);
                return res.status(statusCode).json(response);
            }

            const doctor = await DoctorCall.setStatus(id, bool ? 1 : 0);
            if (!doctor) {
                const { response, statusCode } = formatErrorResponse(new Error('Doctor not found'), HTTP_STATUS.NOT_FOUND);
                return res.status(statusCode).json(response);
            }

            const message = bool ? 'Doctor activated successfully' : 'Doctor deactivated successfully';
            const { response, statusCode } = formatResponse(true, message, { doctor });
            return res.status(statusCode).json(response);
        } catch (error) {
            const { response, statusCode } = formatErrorResponse(error);
            return res.status(statusCode).json(response);
        }
    }
}

module.exports = DoctorCallController;
