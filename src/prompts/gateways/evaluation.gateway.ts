import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { UseGuards } from '@nestjs/common';
// import { OnEvent } from '@nestjs/event-emitter'; // Not used currently
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { EvaluationProgress } from '../services/evaluation.service';

@WebSocketGateway({
  namespace: '/evaluation',
  cors: {
    origin: '*',
  },
})
export class EvaluationGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private activeEvaluations = new Map<string, Set<string>>(); // evaluationId -> Set of client IDs

  handleConnection(client: Socket) {
    console.log(`Client connected to evaluation gateway: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected from evaluation gateway: ${client.id}`);

    // Remove client from all evaluation rooms
    this.activeEvaluations.forEach((clients, evaluationId) => {
      clients.delete(client.id);
      if (clients.size === 0) {
        this.activeEvaluations.delete(evaluationId);
      }
    });
  }

  @UseGuards(JwtAuthGuard)
  @SubscribeMessage('subscribeToEvaluation')
  handleSubscribeToEvaluation(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { evaluationId: string },
  ) {
    const { evaluationId } = data;

    // Join the evaluation room
    client.join(`evaluation:${evaluationId}`);

    // Track active evaluations
    if (!this.activeEvaluations.has(evaluationId)) {
      this.activeEvaluations.set(evaluationId, new Set());
    }
    this.activeEvaluations.get(evaluationId)!.add(client.id);

    // Send confirmation
    client.emit('subscriptionConfirmed', {
      evaluationId,
      message: 'Successfully subscribed to evaluation updates',
    });
  }

  @UseGuards(JwtAuthGuard)
  @SubscribeMessage('unsubscribeFromEvaluation')
  handleUnsubscribeFromEvaluation(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { evaluationId: string },
  ) {
    const { evaluationId } = data;

    // Leave the evaluation room
    client.leave(`evaluation:${evaluationId}`);

    // Update tracking
    const clients = this.activeEvaluations.get(evaluationId);
    if (clients) {
      clients.delete(client.id);
      if (clients.size === 0) {
        this.activeEvaluations.delete(evaluationId);
      }
    }

    // Send confirmation
    client.emit('unsubscriptionConfirmed', {
      evaluationId,
      message: 'Successfully unsubscribed from evaluation updates',
    });
  }

  // @OnEvent('evaluation.progress')
  // handleEvaluationProgress(progress: EvaluationProgress) {
  //   // Emit to all clients in the evaluation room
  //   this.server
  //     .to(`evaluation:${progress.evaluationId}`)
  //     .emit('evaluationProgress', progress);
  // }

  // Method to broadcast evaluation completion to all interested clients
  broadcastEvaluationComplete(evaluationId: string, result: any) {
    this.server.to(`evaluation:${evaluationId}`).emit('evaluationComplete', {
      evaluationId,
      result,
      timestamp: new Date().toISOString(),
    });

    // Clean up tracking
    this.activeEvaluations.delete(evaluationId);
  }

  // Method to get active evaluation subscriptions (useful for monitoring)
  getActiveEvaluations(): { evaluationId: string; clientCount: number }[] {
    return Array.from(this.activeEvaluations.entries()).map(
      ([evaluationId, clients]) => ({
        evaluationId,
        clientCount: clients.size,
      }),
    );
  }
}
