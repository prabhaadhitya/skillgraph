import { asyncHandler } from '../utils/asyncHandler.js';
import { respond } from '../utils/respond.js';
import * as adminService from '../services/admin.service.js';

export const createSkill = asyncHandler(async (req, res) => {
  const data = await adminService.createSkill(req.validated.body);
  respond.created(res, data);
});

export const updateSkill = asyncHandler(async (req, res) => {
  const data = await adminService.updateSkill(req.validated.params.slug, req.validated.body);
  respond.ok(res, data);
});

export const deleteSkill = asyncHandler(async (req, res) => {
  const data = await adminService.deleteSkill(req.validated.params.slug);
  respond.ok(res, data);
});

export const getRelationships = asyncHandler(async (req, res) => {
  const data = await adminService.getRelationships(req.validated.query?.skill);
  respond.ok(res, data);
});

export const createRelationship = asyncHandler(async (req, res) => {
  const data = await adminService.createRelationship(req.validated.body);
  respond.created(res, data);
});

export const deleteRelationship = asyncHandler(async (req, res) => {
  const data = await adminService.deleteRelationship(req.validated.params.id);
  respond.ok(res, data);
});

export const createCareer = asyncHandler(async (req, res) => {
  const data = await adminService.createCareer(req.validated.body);
  respond.created(res, data);
});

export const updateCareer = asyncHandler(async (req, res) => {
  const data = await adminService.updateCareer(req.validated.params.slug, req.validated.body);
  respond.ok(res, data);
});

export const updateCareerSkills = asyncHandler(async (req, res) => {
  const data = await adminService.updateCareerSkills(
    req.validated.params.slug,
    req.validated.body.skills,
  );
  respond.ok(res, data);
});

export default {
  createSkill,
  updateSkill,
  deleteSkill,
  getRelationships,
  createRelationship,
  deleteRelationship,
  createCareer,
  updateCareer,
  updateCareerSkills,
};
