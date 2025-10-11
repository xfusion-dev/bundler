import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { AssignmentService } from './assignment.service';

@Controller('assignment')
export class AssignmentController {
  constructor(private readonly assignmentService: AssignmentService) {}

  @Post('execute')
  @HttpCode(HttpStatus.OK)
  async executeAssignment(@Body() body: { assignmentId: number }) {
    try {
      await this.assignmentService.executeAssignment(body.assignmentId);
      return { success: true, message: 'Assignment executed successfully' };
    } catch (error) {
      return { success: false, error: error?.message || String(error) };
    }
  }
}
